<?php
/**
 * This source file is part of the open source project
 * ExpressionEngine (https://expressionengine.com)
 *
 * @link      https://expressionengine.com/
 * @copyright Copyright (c) 2003-2020, Packet Tide, LLC (https://www.packettide.com)
 * @license   https://expressionengine.com/license Licensed under Apache License, Version 2.0
 */

namespace ExpressionEngine\Service\Permission;

/**
 * Permission Service
 */
class Permission {

	/**
	 * @var array $userdata An array of the session userdata
	 */
	protected $userdata;

	/**
	 * @var array $permissions An array of granted permissions
	 */
	protected $permissions;

	protected $roles;

	protected $model_delegate;

	protected $site_id;

	/**
	 * Constructor: sets the userdata.
	 *
	 * @param array $userdata The session userdata array
	 */
	public function __construct($model_delegate, array $userdata = [], array $permissions = [], array $roles = [], $site_id = 1)
	{
		$this->model_delegate = $model_delegate;
		$this->userdata = $userdata;
		$this->permissions = $permissions;
		$this->roles = $roles;
		$this->site_id = $site_id;

		//set role for members that don't have record in members_roles
		if (isset($userdata['primary_role_id']))
		{
			$this->roles[$userdata['primary_role_id']] = $userdata['primary_role_name'];
		}
	}

	public function rolesThatHave($permission, $site_id = NULL, $fuzzy = false)
	{
		$site_id = ($site_id) ?: $this->site_id;
		$query = $this->model_delegate->get('Permission')
			->fields('role_id')
			->filter('site_id', $site_id);
		if (!$fuzzy) {
			$query->filter('permission', $permission);
		} else {
			$query->filter('permission', 'LIKE', $permission . '%');
		}
		$groups = $query->all();

		if ($groups)
		{
			return $groups->pluck('role_id');
		}

		return [];
	}

	public function rolesThatCan($permission, $site_id = NULL)
	{
		return $this->rolesThatHave('can_' . $permission, $site_id);
	}

	public function isSuperAdmin()
	{
		return isset($this->roles[1]);
	}

	public function hasRole($role)
	{
		if (is_numeric($role))
		{
			return isset($this->roles[$role]);
		}

		return in_array($role, $this->roles);
	}

	public function hasAnyRole($roles)
	{
		foreach ($roles as $role)
		{
			if ($this->hasRole($role))
			{
				return TRUE;
			}
		}

		return FALSE;
	}

	/**
	 * Has a single permission
	 *
	 * Member access validation
	 *
	 * @param	string  single permission name
	 * @return	bool    TRUE if member has permission
	 */
	public function has()
	{
		// Super Admins always have access
		if ($this->isSuperAdmin())
		{
			return TRUE;
		}
		
		$which = func_get_args();

		if (count($which) !== 1)
		{
			throw new \BadMethodCallException('Invalid parameter count, must have exactly 1.');
		}

		return $this->hasAll($which[0]);
	}

	public function can($which)
	{
		return $this->has('can_' . $which);
	}

	/**
	 * Has All
	 *
	 * Member access validation
	 *
	 * @param	mixed   array or any number of permission names
	 * @return	bool    TRUE if member has all permissions
	 */
	public function hasAll()
	{
		// Super Admins always have access
		if ($this->isSuperAdmin())
		{
			return TRUE;
		}
		
		$which = $this->prepareArguments(func_get_args());

		if ( ! count($which))
		{
			throw new \BadMethodCallException('Invalid parameter count, 1 or more arguments required.');
		}

		foreach ($which as $w)
		{
			if ( ! $this->check($w))
			{
				return FALSE;
			}
		}

		return TRUE;
	}

	/**
	 * Has Any
	 *
	 * Member access validation
	 *
	 * @param	mixed   array or any number of permission names
	 * @return	bool    TRUE if member has any permissions in the set
	 */
	public function hasAny()
	{
		// Super Admins always have access
		// SA access above count below so entries page doesn't bomb out on first run
		// order matters
		if ($this->isSuperAdmin())
		{
			return TRUE;
		}
		
		$which = $this->prepareArguments(func_get_args());

		if ( ! count($which))
		{
			throw new \BadMethodCallException('Invalid parameter count, 1 or more arguments required.');
		}

		foreach ($which as $w)
		{
			if ($this->check($w))
			{
				return TRUE;
			}
		}

		return FALSE;
	}

	protected function prepareArguments($which)
	{
		$args = [];

		foreach ($which as $w)
		{
			if (is_array($w))
			{
				$args += $w;
			}
			else
			{
				$args[] = $w;
			}
		}

		return $args;
	}

	/**
	 * Check for the permission first looking in the userdata then in the permission array
	 *
	 * @param string $which any number of permission names
	 * @return bool TRUE if the permission is in the userdata or the permission key exists; FALSE otherwise
	 */
	protected function check($which) {
		//legacy permission support
		if (in_array($which, ['can_create_entries', 'can_edit_other_entries', 'can_edit_self_entries', 'can_delete_self_entries', 'can_delete_all_entries', 'can_assign_post_authors'])) {
			$member = ee()->session->getMember();
			if (!empty($member)) {
				$assigned_channels = $member->getAssignedChannels()->pluck('channel_id');
				foreach ($assigned_channels as $channel_id)
				{
					$check = $this->check($which . '_channel_id_' . $channel_id);
					if ($check) {
						return $check;
					}
				}
			}
			return false;
		}

		$k = $this->getUserdatum($which);

		if ($k === TRUE OR $k == 'y') {
			return TRUE;
		}

		return array_key_exists($which, $this->permissions);
	}

	/**
	 * Get user datum
	 *
	 * Member access validation
	 *
	 * @param	string $which any number of permission names
	 * @return	mixed    False if the requested userdata array key doesn't exist
	 *							otherwise returns the key's value
	 */
	protected function getUserdatum($which)
	{
		return ( ! isset($this->userdata[$which])) ? FALSE : $this->userdata[$which];
	}

}
// EOF
